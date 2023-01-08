import React from 'react';
import "./grid.css"
import "./App.css"
import GridLayout from 'react-grid-layout';
import "/node_modules/react-grid-layout/css/styles.css"
import "/node_modules/react-resizable/css/styles.css"
import { WholeView } from "./tradingviews";
import Select from 'react-select';

// Buttons
import Buttons from './buttons';

// Control Panel
import RuleBuilder from './ruleBuilder';

// Grid
//import Grid from '@mui/material/Grid';

class GridStructure extends React.Component {
    render() { 

        const layout = [
            // Trading view
            {i: 'a', x: 0, y: 5, w: 20, h: 14, minW: 1.5, maxW: 4},

            // Tiles
            // b1 = Number of Buy Signals
            {i: 'b1', x: 0, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},
            // b2 = Number of Sell Signals
            {i: 'b2', x: 1.5, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},
            {i: 'b3', x: 0, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},
            {i: 'b4', x: 0, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},

            // Debug Buttons Collection
            {i: 'c', x: 3, y: 0, w: 3, h: 8, minW: 2, maxW: 8},

            // Control Panel
            {i: 'd', x: 7, y: 0, w: 6, h: 8, minW: 2, maxW: 8},

            // Balance Panel
            {i: 'balance', x: 9, y: 3, w: 6, h: 12, minW: 2, maxW: 8}
          ];

        return (
            <GridLayout className="layout" layout={layout} cols={12} rowHeight={30} width={1400}>
                
               
                <div className='layoutElement gridElement' key="b1" id="NumberOfBuySignals">
                    <p className='layoutElementText emberSecondaryolor'>Buy Signals:</p>
                    <p className='layoutElementText emberBigFont'>None</p>
                </div>

                <div className='layoutElement gridElement' key="b2" id="NumberOfSellSignals">
                    <p className='layoutElementText emberPrimaryColor'>Sell Signals:</p>
                    <p className='layoutElementText emberBigFont'>None</p>
                </div>

                <div className='layoutElement' key="c" id="DebugButtonElement">
                    <p className='layoutElementText emberSmallFont'>Debug Buttons</p>
                    <Buttons.PingBackend />
                    <Buttons.GetBinanceClient />
                    <Buttons.FetchBalances />
                    <Buttons.DebugButton />
                </div>

                <div className='layoutElement' key="balance" id="BalancePanel">
                    <p className='layoutElementText emberSmallFont'>Balance</p>
                    <div id="BalanceDiv">
                        <p className='layoutElementText emberSmallFont' id="TotalBalance">No Balance detected</p>
                        <img src={require('../node_modules/cryptocurrency-icons/32/white/apex.png')}></img>
                        <BalanceGrid></BalanceGrid>
                    </div>
                </div>

                <div className='layoutElement' key="d" id="ControlPanel">
                    <p className='layoutElementText emberSmallFont'>Control Panel</p>
                    <RuleBuilder.ruleBuilder />
                </div>

                <div className='layoutElement' key="a" id="TradingView"> <WholeView /> </div>
            </GridLayout>
        )
    }
}

class BalanceGrid extends React.Component {
    render() {
        return (
            <div>
                
            </div>
        );
    }
}

export default GridStructure;