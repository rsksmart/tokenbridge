
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
    var host = 'http://127.0.0.1:8545';

    function post(host, request, fn) {
        $.post(
            host,
            JSON.stringify(request),
            fn
        );
    }

    function show(data) {
        alert(JSON.stringify(data, null, 4));
    }

    function getAccounts(fn) {
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_accounts",
            params: []
        };
        
        post(host, request, fn);
    }
    
    var data = {
    };
    
    function loadData(fn) {
        $.getJSON('mainconf.json', function (data1) {
            data.accounts = []

            for (var k = 0; k < data1.accounts.length; k++)
                data.accounts.push({
                    name: names[k],
                    address: data1.accounts[k]
                });
            
            data.main = {
                custodian: data1.custodian,
                token: data1.token,
                manager: data1.manager
            };
                        
            $.getJSON('sideconf.json', function (data2) {
                data.side = {
                    custodian: data2.custodian,
                    token: data2.token,
                    manager: data2.manager
                };
                
                if (data2.custodian)
                    data.accounts.unshift({
                        name: 'Sidechain Custodian',
                        address: data2.custodian
                    });

                if (data1.custodian)
                    data.accounts.unshift({
                        name: 'Mainchain Custodian',
                        address: data1.custodian
                    });
                
                fn(data);
            }); 
        });
    }
    
    function fetchBalances(accounts, bfn) {
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
                }]
            };
            
            post(host, request, function (data) {
                var balance = data.result;
                accounts[n]["balance" + m] = balance;
                bfn(n, m, balance);
            });
        }
    }
    
    function randomAccount(accounts) {
        while (true) {
            var n = Math.floor(Math.random() * accounts.length);
            
            if (accounts[n].name.indexOf('ustodian') >= 0)
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
    
    function distributeToken(from, balance, token, accounts) {
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
        
        post(host, request, console.log);
    }
    
    function transfer(from, to, token, amount) {
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
        
        post(host, request, console.log);
    }

    function distributeTokens(accounts, cb) {
        var naccounts = accounts.length;
        
        for (var k = 0; k < naccounts; k++) {
            var name = accounts[k].name;
            
            if (name.indexOf('ustodian') >= 0)
                continue;
            
            if (accounts[k].balance0)
                distributeToken(accounts[k].address, accounts[k].balance0, data.main.token, accounts);

            if (accounts[k].balance1)
                distributeToken(accounts[k].address, accounts[k].balance1, data.side.token, accounts);
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

