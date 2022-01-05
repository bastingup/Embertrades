import React from 'react';
import {Helmet} from "react-helmet-async";
import { TickerTape, AdvancedRealTimeChart  } from "react-ts-tradingview-widgets";

let tapeViewData = 
    [
        {
        "title": "",
        "proName": "BINANCE:DOTBUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:ETHBUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:BTCBUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:IOTABUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:TRXBUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:XLMBUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:SOLBUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:ADABUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:YGGBUSD"
        },
        {
        "title": "",
        "proName": "BINANCE:DOGEBUSD"
        }
    ]


class TapeView extends React.Component {
    render() { 
        return (<div>
            <TickerTape colorTheme="dark" TickerSymbol={tapeViewData}></TickerTape>
        </div>);
    }
}

class WholeView extends React.Component {
    render() { 
        return (<div>
            <AdvancedRealTimeChart theme="dark" autosize></AdvancedRealTimeChart>
        </div>);
    }
}
 
export {TapeView, WholeView};