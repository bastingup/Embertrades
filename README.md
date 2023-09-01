# Embertrades
Embertrades is a fullstack crypto trading bot, consisting of a React Frontend, which is in very early development, and a NodeJS backend.
The software launches a React Webapp on one port and the NodeJS server on another port. Conneted via an API, Embertrade will offer an easy-to-use dashboard with a clean and organized overview of all relevant trading signals.
The Embertrades backend, written as NodeJS is capable of utilizing a variety of technical indicators with variable settings, like the ADX, MACD, MA and many others, in order to give a comprehensive market overview. The indicators check and cross validate market trends, buy/sell signals, as well as direction of movement.
The software is connected to Binance via its API. Front- and backend communicate via API.

All index files are for development purposes, the main files are the actual core files.
The project is still under early development. Todos are seperating the main into respective classes, getting rid of the huge amount of global variables and connecting it to the frontend for proper usage.

# Current State
The main focus is on the backend. The NodeJS backend is supposed to be able to run on its own, giving trading signals, doing backtesting and actually trading. You can read about all it is doing in the console outputs. The backend will continue to be the focus. What the frontend will look like exactly, I don't know.

# Modes
- Dev: Just sets up the software, downloads data and builds signals on historical data. Stops before the trading/backtesting starts. Just for developing signals etc.
- Backtest: Define a strategy in you config file, backtest it on historical data and see how Embertrades would actually have decided on signals. Visualize the results in an ipynb.
- Simulative: Like live trading without actually executing a trade. Play money so to speak. Also good if you just want the signals and trade yourself.
- Live: Actually trading with you real money on Binance.

# How To
- Install NodeJS and all the dependencies from the project if you want to use backend only. If you want to use/work on the frontend, install React and whatever.
- Create a .env variable and paste your Binance API Key and Secret into it.
- Go to the config file of the backend and configure your things. Important are the "trading" and the "rules" key. That is basically where you define how/when/where.
- Set mode to backtest, run the NodeJS and let the jupyter run through. There you find a nice visual of where your ruleset lead to purchases, stoploss and profitable sales.

# Outlook
There will be different types of orders like trailing, normal orders, short/long positions and a new mode that constantly backtests all strategies while actually trading to correct itself and find the best strategy. Also there will be a frotend at some point that is actually usable.
