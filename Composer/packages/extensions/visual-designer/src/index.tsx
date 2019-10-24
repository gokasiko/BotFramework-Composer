/** @jsx jsx */
import { jsx, CacheProvider } from '@emotion/core';
import createCache from '@emotion/cache';
import React, { useRef, useState, useEffect } from 'react';
import { isEqual } from 'lodash';
import formatMessage from 'format-message';

import { ObiEditor } from './editors/ObiEditor';
import { NodeRendererContext } from './store/NodeRendererContext';
import { SelfHostContext } from './store/SelfHostContext';
import { StoreContext } from './store/StoreContext';
import useStore from './store/useStore';
import setFocusState from './actions/setFocusState';

formatMessage.setup({
  missingTranslation: 'ignore',
});

const emotionCache = createCache({
  // @ts-ignore
  nonce: window.__nonce__,
});

const VisualDesigner: React.FC<VisualDesignerProps> = ({
  dialogId,
  focusedEvent,
  focusedSteps,
  focusedTab,
  data: inputData,
  shellApi,
  hosted,
}): JSX.Element => {
  const dataCache = useRef({});

  /**
   * VisualDesigner is coupled with ShellApi where input json always mutates.
   * Deep checking input data here to make React change detection works.
   */
  const dataChanged = !isEqual(dataCache.current, inputData);
  if (dataChanged) {
    dataCache.current = inputData;
  }

  const data = dataCache.current;
  const {
    navTo,
    onFocusEvent,
    onFocusSteps,
    saveData,
    updateLgTemplate,
    getLgTemplates,
    removeLgTemplate,
    undo,
    redo,
    syncEditorState,
  } = shellApi;

  const focusedId = Array.isArray(focusedSteps) && focusedSteps[0] ? focusedSteps[0] : '';

  // NOTE: avoid re-render. https://reactjs.org/docs/context.html#caveats
  const [context, setContext] = useState({
    focusedId,
    focusedEvent,
    focusedTab,
    updateLgTemplate: updateLgTemplate,
    getLgTemplates: getLgTemplates,
    removeLgTemplate: removeLgTemplate,
  });

  useEffect(() => {
    setContext({
      ...context,
      focusedId,
      focusedEvent,
      focusedTab,
    });
  }, [focusedEvent, focusedSteps, focusedTab]);

  const { state, dispatch } = useStore();

  useEffect(() => {
    if (!isEqual(focusedSteps, state.focusedIds)) {
      // NOTES: This hook works like 'componentWillReceiveProps'. Syncs props to store.
      // TODO: remove this hook after fully adapting store to Shell.
      dispatch(setFocusState(focusedSteps));
    }
  }, [focusedSteps]);

  useEffect(() => {
    syncEditorState(state);
  }, [state]);

  return (
    <CacheProvider value={emotionCache}>
      <StoreContext.Provider value={{ state, dispatch }}>
        <NodeRendererContext.Provider value={context}>
          <SelfHostContext.Provider value={hosted}>
            <div data-testid="visualdesigner-container" css={{ width: '100%', height: '100%', overflow: 'scroll' }}>
              <ObiEditor
                key={dialogId}
                path={dialogId}
                data={data}
                focusedSteps={focusedSteps}
                onFocusSteps={(ids: string[], fragmentId?: string) => {
                  dispatch(setFocusState(ids));
                  onFocusSteps(ids, fragmentId);
                }}
                focusedEvent={focusedEvent}
                onFocusEvent={onFocusEvent}
                onOpen={(x, rest) => navTo(x, rest)}
                onChange={x => saveData(x)}
                undo={undo}
                redo={redo}
              />
            </div>
          </SelfHostContext.Provider>
        </NodeRendererContext.Provider>
      </StoreContext.Provider>
    </CacheProvider>
  );
};

interface VisualDesignerProps {
  data: object;
  dialogId: string;
  focusedEvent: string;
  focusedSteps: string[];
  focusedTab: string;
  shellApi: any;
  hosted: boolean;
  currentDialog: { id: string; displayName: string; isRoot: boolean };
}

VisualDesigner.defaultProps = {
  dialogId: '',
  focusedEvent: '',
  focusedSteps: [],
  data: {},
  shellApi: {
    navTo: () => {},
    onFocusEvent: (_eventId: string) => {},
    onFocusSteps: (_stepIds: string[], _fragment?: string) => {},
    onSelect: (_ids: string[]) => {},
    saveData: () => {},
    syncState: state => {},
  },
};

export default VisualDesigner;
