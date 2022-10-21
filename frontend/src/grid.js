import React from 'react';
import "./grid.css"
import "./App.css"
import GridLayout from 'react-grid-layout';
import "/node_modules/react-grid-layout/css/styles.css"
import "/node_modules/react-resizable/css/styles.css"
import { WholeView } from "./tradingviews";


class GridStructure extends React.Component {
    render() { 

        const layout = [
            // Trading view
            {i: 'a', x: 0, y: 1, w: 20, h: 14, minW: 1.5, maxW: 4},

            // Tiles
            {i: 'b1', x: 0, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},
            {i: 'b2', x: 1.5, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},
            {i: 'b3', x: 0, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},
            {i: 'b4', x: 0, y: 0, w: 1.5, h: 4, minW: 1.5, maxW: 8},

            // Debug
            {i: 'c', x: 3, y: 0, w: 3, h: 8, minW: 2, maxW: 8},
            {i: 'd', x: 7, y: 0, w: 6, h: 8, minW: 2, maxW: 8}
          ];

        return (
            <GridLayout className="layout" layout={layout} cols={12} rowHeight={30} width={1400}>
                
                <div className='layoutElement gridElement' key="b1">
                    <p className='layoutElementText emberSecondaryolor'>Buy Signals:</p>
                    <p className='layoutElementText emberBigFont'>12</p>
                </div>

                <div className='layoutElement gridElement' key="b2">
                    <p className='layoutElementText emberPrimaryColor'>Sell Signals:</p>
                    <p className='layoutElementText emberBigFont'>4</p>
                </div>

                <div className='layoutElement' key="c">b</div>
                <div className='layoutElement' key="d">c</div>

                <div className='layoutElement' key="a"> <WholeView /> </div>
            </GridLayout>
        )
    }
}
 
export default GridStructure;