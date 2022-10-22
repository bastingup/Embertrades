
export function buildBalanceObject(res) {

    // Iterate all balances
    const keys = Object.keys(res.data);
    let availableBalances = []

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        
        // Only if balance in a symbol exists
        if (res.data[key].total > 0)
            availableBalances.push({'key' : key, 'balances' : res.data[key]})
        }

    return availableBalances
}