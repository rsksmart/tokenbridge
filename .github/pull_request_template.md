### Title of pull request

The pull request should be described here

### Description

- Describe here your pull request modifications
- It could be more than one thing

### How to Test

- Run both `ganache-cli`
- Enter into the bridge directory and run all the tests

#### Case 1

1. Go to bridge directory
```shell
$~ cd bridge
```

2. Run all the tests
```shell
$~ npm run test
```

__Expected Result__
- It should pass the test
![image](https://user-images.githubusercontent.com/17556614/131563928-05d6cb84-caf0-4ee0-8458-3464257e7f6c.png)

3. Run the first ganache-cli
```shell
$~ npm run ganache
```

4. Open another shell and run the ganache mirror
```shell
$~ npm run ganache-mirror
```

5. Go to the federator directory
```shell
$~ cd ../federator
```

6. Run the integration test
```shell
$~ npm run integrationTest
```

__Expected Result__
- It should pass the test
![image](https://user-images.githubusercontent.com/17556614/137998725-3938ce87-87b1-4631-9cff-095935854d6e.png)


7. Run the integration test
```shell
$~ npm run integrationTest
```
__Expected Result__
- It should pass the test
![image](https://user-images.githubusercontent.com/17556614/137998804-e984a70a-2ae3-4cc4-861e-83c691d53a77.png)

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