import * as monaco from 'monaco-editor';

window.MonacoEnvironment = {
  getWorkerUrl(moduleId, label) {
    switch (label) {
      case 'json':
        return './js/vs/language/json/json.worker.js';
      case 'css':
      case 'scss':
      case 'less':
        return './js/vs/language/css/css.worker.js';
      case 'html':
      case 'handlebars':
      case 'razor':
        return './js/vs/language/html/html.worker.js';
      case 'typescript':
      case 'javascript':
        return './js/vs/language/typescript/ts.worker.js';
      default:
        return './js/vs/editor/editor.worker.js';
    }
  },
};

const editor = (div) =>
  monaco.editor.create(div, {
    language: 'javascript',
    automaticLayout: true,

    // Code to disable intellisense from https://github.com/microsoft/monaco-editor/issues/1681
    quickSuggestions: {
      other: false,
      comments: false,
      strings: false,
    },
    parameterHints: { enabled: false },
    ordBasedSuggestions: false,
    suggestOnTriggerCharacters: false,
    acceptSuggestionOnEnter: 'off',
    tabCompletion: 'off',
    wordBasedSuggestions: false,
    // End code to disable intellisense.
  });

export default editor;
