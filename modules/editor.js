import * as monaco from 'monaco-editor';

window.MonacoEnvironment = {
  // This seems like a kludge. Maybe it's good. What is the difference between
  // good and bad really? This seems to account for the case that we've set a
  // <base> tag in our HTML and if we didn't has no effect so that seems fine.
  baseUrl: document.querySelector('body').baseURI,

  getWorkerUrl(moduleId, label) {
    switch (label) {
      case 'json':
        return `js/vs/language/json/json.worker.js`;
      case 'css':
      case 'scss':
      case 'less':
        return `js/vs/language/css/css.worker.js`;
      case 'html':
      case 'handlebars':
      case 'razor':
        return `js/vs/language/html/html.worker.js`;
      case 'typescript':
      case 'javascript':
        return `js/vs/language/typescript/ts.worker.js`;
      default:
        return `js/vs/editor/editor.worker.js`;
    }
  },
};

// Options to disable intellisense from
// https://github.com/microsoft/monaco-editor/issues/1681
const disableIntellisense = {
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
};

const editor = (id) => {
  const div = document.getElementById(id);
  const e = monaco.editor.create(div, {
    language: 'javascript',
    automaticLayout: true,
    ...disableIntellisense,
  });

  // This seems to be the way to make the editor resize when the window resizes.
  window.addEventListener('resize', () => e.layout({ width: 0, height: 0 }));

  return e;
};

export default editor;
