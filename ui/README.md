# Token Bride UI

## Rationale
Interacting with smart contracts can be cucumbersome as you need to past the abis and contract addresses and have no validation of the inputs you are using. 
Thats why we created a Dapp to improve the user experience when using the token bridge.

## Developers
This UI uses plain HTML and js for facility of use. To use is locally serve the page using
`python -m SimpleHTTPServer 8000`
And then you can interact with the dapp on your browser at `localhost:8000`
The UI detects if the url includes `testnet` in order to avoid someone sending incorrectly funds from a live network. If you want to try it locally add `?testnet` to the url to use the Rsk Testnet and Kovan.
