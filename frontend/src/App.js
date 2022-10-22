// Global & React
import './App.css';
import Head from "./head"

// Trading View
import {TapeView, WholeView} from "./tradingviews"

// Grid Layout
import GridStructure from './grid';
import "/node_modules/react-grid-layout/css/styles.css"
import "/node_modules/react-resizable/css/styles.css"

// States
import {useState} from 'react';
import {allStates} from './legalStates.js';

// --------------------------------------------------
// ------------------------- GLOBAL OPTIONS FOR DEBUGGING
// --------------------------------------------------


// --------------------------------------------------
// -----------///----------- GLOBAL OPTIONS FOR DEBUGGING
// --------------------------------------------------
function App() {

  const [appState, setAppState] = useState(allStates.states.MAINAPP);
  console.log(appState);

  switch(appState) {

    case allStates.states.MAINAPP:
      return (
        <div className="App">
          
          {/* ------------ HEAD / LOGO */}
          <Head />

          {/* ------------ Actual Grid Body */}
          <GridStructure />

          {/* ------------ Footer */}
          <div className="footer">
            <TapeView />
          </div>
          
        </div>
      );

    case allStates.states.DEBUG:
      return (
        <div className="App">
          <Head />
        </div>
      );

    case allStates.states.HOMESCREEN:
      return (
        <div className="App">
          
        </div>
      );
  }
}

export default App; 