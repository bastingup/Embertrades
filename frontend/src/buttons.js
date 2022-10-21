import React, { Component } from 'react';
import axios from "axios";

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

class ConnectToBackend extends Component {

    // TODO
    handleClick = () => {
        
        axios.post(`http://127.0.0.1:3001/api/server/alive`)
        .then(res => {
            console.log(res);
           // if ()

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
                <button onClick={this.handleClick}>Connect to Backend</button>
            </div>
        );
    }
}


class GetBinanceClient extends Component {

    handleClick = () => {

        axios.post(`http://127.0.0.1:3001/api/account/getBinanceClient`)
        .then(res => {
            console.log(res);
            console.log(res.data);
        })
        
    };

    render() {
        return (
            <div> <button onClick={this.handleClick}>GET BINANCE</button> </div>
        );
    }
}

export default {DebugButton, ConnectToBackend, GetBinanceClient};