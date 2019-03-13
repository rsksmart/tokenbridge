
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
    var names = [ 'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Fiona', 'Ginger', 'Hanna', 'Ian', 'John', 'Kim', 'Louise' ];
    
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

    function getAccounts(network, fn) {
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_accounts",
            params: []
        };
        
        post(getHost(network), request, fn);
    }
    
    var data = {
    };
    
    function loadData(fn) {
        $.getJSON('mainconf.json', function (data1) {
            mainhost = data1.host;
            
            data.accounts = []

            for (var k = 0; k < data1.accounts.length; k++)
                data.accounts.push({
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
                
                data.side = {
                    bridge: data2.bridge,
                    token: data2.token,
                    manager: data2.manager
                };
                
                if (data2.bridge)
                    data.accounts.unshift({
                        name: 'Sidechain Bridge',
                        address: data2.bridge
                    });

                if (data1.bridge)
                    data.accounts.unshift({
                        name: 'Mainchain Bridge',
                        address: data1.bridge
                    });
                
                fn(data);
            }); 
        });
    }
    
    function fetchBalances(accounts, block, bfn) {
        if (!bfn) {
            bfn = block;
            block = 'latest';
        }
        
        for (var k = 0; k < accounts.length; k++) {
            fetchBalance(k, 0);
            fetchBalance(k, 1);
        }
        
        function fetchBalance(n, m) {
            var request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [{
                    from: accounts[0].address,
                    to: m == 0 ? data.main.token : data.side.token,
                    value: 0,
                    gas: 2000000,
                    gasPrice: 0,
                    data: "0x70a08231000000000000000000000000" + accounts[n].address.substring(2)
                }, block]
            };
            
            post(getHost(m), request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                console.dir(data);
                console.dir(data.result);
                var balance = data.result;
                accounts[n]["balance" + m] = balance;
                bfn(n, m, balance);
            });
        }
    }
    
    function randomAccount(accounts) {
        while (true) {
            var n = Math.floor(Math.random() * accounts.length);
            
            if (accounts[n].name.indexOf('ridge') >= 0)
                continue;
            
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
    
    function distributeToken(network, from, balance, token, accounts) {
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
        
        console.dir(tx);
        
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_sendTransaction",
            params: [ tx ]
        };
        
        post(getHost(network), request, console.log);
    }
    
    function transfer(network, from, to, token, amount) {
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
        
        console.dir(request);
        
        post(getHost(network), request, console.log);
    }

    function distributeTokens(accounts, cb) {
        var naccounts = accounts.length;
        
        for (var k = 0; k < naccounts; k++) {
            var name = accounts[k].name;
            
            if (name.indexOf('ustodian') >= 0)
                continue;
            
            if (accounts[k].balance0)
                distributeToken(0, accounts[k].address, accounts[k].balance0, data.main.token, accounts);

            if (accounts[k].balance1)
                distributeToken(1, accounts[k].address, accounts[k].balance1, data.side.token, accounts);
        }
        
        setTimeout(cb, 2000);
    }
    
    return {
        getAccounts: getAccounts,
        loadData: loadData,
        fetchBalances: fetchBalances,
        distributeTokens: distributeTokens,
        transfer: transfer
    }
})();

