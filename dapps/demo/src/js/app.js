
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
            jsonrpc: "jsonrpc",
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
                jsonrpc: "jsonrpc",
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
    
    return {
        getAccounts: getAccounts,
        loadData: loadData,
        fetchBalances: fetchBalances
    }
})();

