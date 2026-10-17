import React, { useEffect, useState } from 'react';
import { loadLanguage } from './src/i18n';

// The screens translate their constants when first loaded, so they load
// only after the saved language is known.
function App() {
  const [Root, setRoot] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    loadLanguage().finally(() => {
      const { AppRoot } = require('./AppRoot');
      setRoot(() => AppRoot);
    });
  }, []);
  return Root ? <Root /> : null;
}

export default App;
