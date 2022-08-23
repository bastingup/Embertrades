import React, { Component } from 'react';
import axios from "axios";

class DebugButton extends Component {

    handleClick = () => {
        console.log('this is:', this);
    };

    render() {
        return (
            <div>
                <button onClick={this.handleClick}>DEBUG BUTTON</button>
            </div>
        );
    }
}

export default DebugButton;