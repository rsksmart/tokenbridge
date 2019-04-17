
var pages = (function () {
    var active = null;
    
    function goTo(page) {
        if (active)
            $("#page_" + active).hide();
        
        $("#page_" + page).show();
        
        active = page;
    }
    
    return {
        goTo: goTo
    }
})();

var app = (function () {
    var names = [ 'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Fiona', 'Ginger', 'Hanna', 'Ian', 'John', 'Kim', 'Louise', 'Marty', 'Nancy', 'Ophrah', 'Peter', 'Robert', 'Sam', 'Tina', 'Umma', 'Vanessa', 'Wilma' ];
    
    var id = 0;
    var mainhost;
    var sidehost;
    
    function post(host, request, fn) {
// https://stackoverflow.com/questions/2845459/jquery-how-to-make-post-use-contenttype-application-json
        
        $.ajaxSetup({
            contentType: "application/json; charset=utf-8"
        });
        
        $.post(
            host,
            JSON.stringify(request),
            fn
        );
    }

    function show(data) {
        alert(JSON.stringify(data, null, 4));
    }
    
    function getHost(network) {
        return network ? sidehost : mainhost;
    }
    
    function getToken(network) {
        return network ? data.side.token : data.main.token;
    }

    var data = {
    };
    
    function loadData(fn) {
        $.getJSON('mainconf.json', function (data1) {
            mainhost = data1.host;
            
            data.mainaccounts = [];
            data.sideaccounts = [];

            for (var k = 0; k < data1.accounts.length; k++)
                data.mainaccounts.push({
                    name: names[k],
                    address: data1.accounts[k]
                });
            
            data.main = {
                bridge: data1.bridge,
                token: data1.token,
                manager: data1.manager
            };
                        
            $.getJSON('sideconf.json', function (data2) {
                sidehost = data2.host;
                
                for (var k = 0; k < data2.accounts.length; k++)
                    data.sideaccounts.push({
                        name: names[k],
                        address: data2.accounts[k]
                    });
                    
                data.side = {
                    bridge: data2.bridge,
                    token: data2.token,
                    manager: data2.manager
                };
                
                if (data2.bridge) {
                    data.mainaccounts.unshift({
                        name: 'Sidechain Bridge',
                        address: data2.bridge
                    });
                    data.sideaccounts.unshift({
                        name: 'Sidechain Bridge',
                        address: data2.bridge
                    });
                }

                if (data1.bridge) {
                    data.mainaccounts.unshift({
                        name: 'Mainchain Bridge',
                        address: data1.bridge
                    });
                    data.sideaccounts.unshift({
                        name: 'Mainchain Bridge',
                        address: data1.bridge
                    });
                }
                
                fn(data);
            }); 
        });
    }
    
    function fetchBalances(network, accounts, bfn) {
        for (var k = 0; k < accounts.length; k++)
            fetchBalance(k);
        
        function fetchBalance(naccount) {
            const account = accounts[naccount];
            const address = account.address.address ? account.address.address : account.address;
            
            var request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [{
                    from: address,
                    to: getToken(network),
                    value: 0,
                    gas: 2000000,
                    gasPrice: 0,
                    data: "0x70a08231000000000000000000000000" + address.substring(2)
                }, 'latest']
            };
            
            post(getHost(network), request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const balance = data.result;
                accounts[naccount].balance = balance;
                bfn(network, naccount, balance);
            });
        }
    }
    
    function randomAccount(accounts) {
        while (true) {            
            var n = Math.floor(Math.random() * accounts.length);
            
            if (accounts[n].name.indexOf('ridge') >= 0)
                continue;
            
            if (accounts[n].address.address)
                return accounts[n].address.address;
            
            return accounts[n].address;
        }
    }
    
    function toHex(value) {
        if (typeof value === 'string' && value.substring(0, 2) === '0x')
            var text = value.substring(2);
        else
            var text = value.toString(16);
        
        while (text.length < 64)
            text = '0' + text;
        
        return text;
    }
    
    function getNonce(network, address, fn) {
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_getTransactionCount",
            params: [ address, "pending" ]
        };
        
        post(getHost(network), request, fn);
    }

// https://ethereum.stackexchange.com/questions/8579/how-to-use-ethereumjs-tx-js-in-a-browser

    function distributeTokenWithSignature(network, from, balance, token, accounts, nonce) {
        let privateKey = from.privateKey;
        
        if (privateKey.startsWith('0x'))
            privateKey = privateKey.substring(2);
        
        const privateBuffer = new ethereumjs.Buffer.Buffer(privateKey, 'hex');
        
        var to = randomAccount(accounts);
        var amount = Math.floor(Math.random() * balance / 2);
        
        const transaction = {
            nonce: nonce,
            to: token,
            value: 0,
            gas: 6000000,
            gasPrice: 0,
            data: "0xa9059cbb000000000000000000000000" + to.substring(2) + toHex(amount)
        };
        
        const tx = new ethereumjs.Tx(transaction);
        tx.sign(privateBuffer);
        const serializedTx = tx.serialize().toString('hex'); 
        
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_sendRawTransaction",
            params: [ serializedTx ]
        };
        
        post(getHost(network), request, console.log);
    }
    
    function distributeToken(network, from, balance, token, accounts) {
        if (from && from.privateKey) {
            getNonce(network, from.address, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                distributeTokenWithSignature(network, from, balance, token, accounts, data.result);
            });
            
            return;
        }
        
        var to = randomAccount(accounts);
        var amount = Math.floor(Math.random() * balance / 2);
        
        var tx = {
            from: from,
            to: token,
            value: 0,
            gas: 6000000,
            gasPrice: 0,
            data: "0xa9059cbb000000000000000000000000" + to.substring(2) + toHex(amount)
        };
        
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_sendTransaction",
            params: [ tx ]
        };
        
        post(getHost(network), request, console.log);
    }
    
    function transferWithSignature(network, from, to, token, amount, nonce) {
        let privateKey = from.privateKey;
        
        if (privateKey.startsWith('0x'))
            privateKey = privateKey.substring(2);
        
        const privateBuffer = new ethereumjs.Buffer.Buffer(privateKey, 'hex');

        const toaddress = to.address ? to.address : to;
        
        var transaction = {
            nonce: nonce,
            to: token,
            value: 0,
            gas: 6000000,
            gasPrice: 0,
            data: "0xa9059cbb000000000000000000000000" + toaddress.substring(2) + toHex(amount)
        };
        
        const tx = new ethereumjs.Tx(transaction);
        tx.sign(privateBuffer);
        const serializedTx = tx.serialize().toString('hex'); 
        
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_sendRawTransaction",
            params: [ serializedTx ]
        };
        
        post(getHost(network), request, console.log);
    }

    function transfer(network, from, to, token, amount) {
        if (from && from.privateKey) {
            getNonce(network, from.address, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                transferWithSignature(network, from, to, token, amount, data.result);
            });
            
            return;
        }

        var tx = {
            from: from,
            to: token,
            value: 0,
            gas: 6000000,
            gasPrice: 0,
            data: "0xa9059cbb000000000000000000000000" + to.substring(2) + toHex(amount)
        };
        
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_sendTransaction",
            params: [ tx ]
        };
        
        post(getHost(network), request, console.log);
    }

    function distributeTokens(network, accounts, cb) {
        var naccounts = accounts.length;
        
        for (var k = 0; k < naccounts; k++) {
            var name = accounts[k].name;
            
            if (name.indexOf('ridge') >= 0)
                continue;
            
            if (accounts[k].balance)
                distributeToken(network, accounts[k].address, accounts[k].balance, getToken(network), accounts);
        }
        
        setTimeout(cb, 2000);
    }
    
    return {
        loadData: loadData,
        fetchBalances: fetchBalances,
        distributeTokens: distributeTokens,
        transfer: transfer
    }
})();

