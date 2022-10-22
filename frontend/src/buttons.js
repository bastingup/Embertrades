import React, { Component } from 'react';
import axios from "axios";
import {buildBalanceObject} from './balances.js'
import './grid.js'

class DebugButton extends Component {

    handleClick = () => {
        axios.post(`http://127.0.0.1:3001/api/server/debug`)
        .then(res => {
            console.log(res);
            console.log(res.data);
        })
    };

    render() {
        return (
            <div>
                <button onClick={this.handleClick}>DEBUG BUTTON</button>
            </div>
        );
    }
}

class PingBackend extends Component {

    handleClick = () => {
        axios.post(`http://127.0.0.1:3001/api/server/alive`)
        .then(res => {
            console.log(res);

            if (res.status == 200) {
                console.log(res.status + " - Backend is alive.")
            }
        }).catch(function(error) {
            if (!error.status) {
                console.log("Backend not responding.")
            }
        });
    };
    
    render() {
        return (
            <div>
                <button onClick={this.handleClick}>Ping Backend</button>
            </div>
        );
    }
}

class GetBinanceClient extends Component {

    handleClick = () => {
        axios.post(`http://127.0.0.1:3001/api/account/getBinanceClient`)
        .then(res => {
            console.log(res);
            if (res.data == true) {
                console.log("SUCCESS! Binance client instantiated.")
            }
        })
    };

    render() {
        return (
            <div> <button onClick={this.handleClick}>GET BINANCE</button> </div>
        );
    }
}

class FetchBalances extends Component {

    handleClick = () => {
        axios.post(`http://127.0.0.1:3001/api/account/fetchBalances`)
        .then(res => {

            const balances = buildBalanceObject(res)
            console.log(balances)
        }
    )
};

    render() {
        return (
            <div> <button onClick={this.handleClick}>Fetch Balances</button> </div>
        );
    }
}

export default {DebugButton, PingBackend, GetBinanceClient, FetchBalances};