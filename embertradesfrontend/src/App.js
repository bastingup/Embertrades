import './App.css';
import Head from "./head"
import {TapeView, WholeView} from "./tradingviews"
import GridStructure from './grid';
import "/node_modules/react-grid-layout/css/styles.css"
import "/node_modules/react-resizable/css/styles.css"

function App() {
  return (
    <div className="App">

      <Head />
      <GridStructure />
      <TapeView />
      
    </div>
  );
}

export default App;
