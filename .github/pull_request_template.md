### Title of pull request

The pull request should be described here

### Description

- Describe here your pull request modifications
- It could be more than one thing

### How to Test

- Run both `ganache-cli`
- Enter into the bridge directory and run the truffle test in the file `nftbridge/NFTBridge_test.js`

#### Case 1

1. Go to bridge directory
```shell
$~ cd bridge
```

2. Run the first ganache-cli
```shell
$~ npm run ganache
```

3. Open another shell and run the ganache mirror
```shell
$~ npm run ganache-mirror
```

4. Run the test file that calls `receiveTokensTo`
```shell
$~ truffle test test/nftbridge/NFTBridge_test.js
```

__Expected Result__
- It should pass the test
![image](https://i.imgur.com/5YWl9X4.png)

#### Case N...

### Checklist

#### Bridge Directory `cd bridge`
- [] Lint is clean `npm run lint`
- [] Test is passing `npm run test`
- [] Contracts are compiling `npm run compile`

#### Federator Directory `cd federator`
- [] Lint is clean `npm run lint`
- [] Test is passing `npm run test`
- [] Typescript is compiling `npm run build`