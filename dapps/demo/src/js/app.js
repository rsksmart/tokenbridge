
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
            data.accounts = data1.accounts;
            
            data.main = {
                custodian: data1.custodian,
                token: data1.token,
                manager: data1.manager
            };
            
            $.getJSON('sideconf.json', function (data2) {
                data.main = {
                    custodian: data1.custodian,
                    token: data1.token,
                    manager: data1.manager
                };
                
                fn(data);
            });
        });
    }
    
    return {
        getAccounts: getAccounts,
        loadData: loadData
    }
})();

