import { MetadataProvider } from "./state/metadataStore";
import MetadataTree from "./components/MetadataTree";
import WindowsHost from "./components/WindowsHost";
import "./App.css";

function App() {
  return (
    <MetadataProvider>
      <div className="app">
        <header className="app-header">
          <h1>Конфигуратор</h1>
        </header>
        <div className="app-body">
          <aside className="tree-panel">
            <MetadataTree />
          </aside>
          <main className="editor-panel">
            <WindowsHost />
          </main>
        </div>
        <footer className="app-tabs">
          <button className="app-tab app-tab-active" type="button">
            Метаданные
          </button>
          <button className="app-tab" type="button" disabled>
            Интерфейсы
          </button>
          <button className="app-tab" type="button" disabled>
            Права
          </button>
        </footer>
      </div>
    </MetadataProvider>
  );
}

export default App;
