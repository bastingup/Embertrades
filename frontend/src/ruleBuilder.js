import React, { Component } from 'react';
import Select from 'react-select';

class ruleBuilder extends Component {

    render() {

        const signalOptions = [
            { label: 'MACD', value: 'MACD', parameters: ["Fast Line", "Slow Line", "Signal Line"] },
            { label: 'Stochastic Osc', value: 'Stochastic Osc', parameters: ["Overbought", "Oversold"] }
          ];

        const onChange = (event) => {
            let d = document.getElementById('signalList');
            d.innerHTML = '';

            for (let i = 0; i < event.length; i++) {
                const node = document.createElement("form").append(<label>
                    event[i].value
                    <input type="text" name="name" />
                </label>);
            }
        }

        return (
            <div>
                <Select
                    onChange = {onChange}
                    options = {signalOptions}
                    isMulti
                />
                <div id='signalList' />
            </div>
        );
    }
}

export default {ruleBuilder};