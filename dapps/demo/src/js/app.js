
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
    
    return {
        getAccounts: getAccounts
    }
})();

