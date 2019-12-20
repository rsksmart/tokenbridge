# Token Bridge Dapp Guide

### Description
This guide describes the steps to transfer tokens using the Web Interface for the RSK Tokenbridge system. Please refer to the project documentation if you’d like to know more about how this bridge works.

It is possible to test the transfer of tokens between RSK and Kovan networks using the RSK Tokenbridge web interface. This will require access to a Chrome or Chromium web browser and install one the extensions [Nifty Wallet](https://chrome.google.com/webstore/detail/nifty-wallet/jbdaocneiiinmjbjlgalhcelgbejmnid) or [Metamask with custom network](https://github.com/rsksmart/rskj/wiki/Configure-Metamask-to-connect-with-RSK).

## Steps
Start by connecting one of the extensions to the RSK Testnet network. If everything is correct, you will see the following:

<p align="center">
  <img src="./images/daap-image1.png" width="500" height="350" />
</p>


Then, locate the address of the token in RSK Testnet for which you want to transfer tokens from. For example 0x5D248F520b023acB815eDeCD5000B98ef84CbF1b

<p align="center">
  <img src="./images/daap-image2.png" width="500" height="350" />
</p>

Paste the address in the Token Address field, the token will be recognized and the symbol shown automatically. Enter the amount you want to transfer and confirm with the Cross the Tokens button. 

<p align="center">
  <img src="./images/daap-image3.png" width="500" height="350" />
</p>


As the alert shows, a few moments after sending the request, it will be necessary to confirm the transaction to approve the token crossing. The following image gives an example of the confirmation popup.

<p align="center">
  <img src="./images/daap-image4.png" width="500" height="350" />
</p>


Once the transaction is approved, the page will be updated with the new status and will ask once again to confirm the token passage to the Bridge:

<p align="center">
  <img src="./images/daap-image5.png" width="500" height="350" />
</p>
 
 <p align="center">
  <img src="./images/daap-image6.png" width="500" height="350" />
</p>

If the transfer is successful, a new alert is displayed

<p align="center">
  <img src="./images/daap-image.7png" width="500" height="350" />
</p>


Next, you can obtain the address associated with the token on the other network, in this case Kovan. To do this, switch from the browser extension to the Kovan network and enter the original token address. Confirm with Get Side Token Address. 
A new address that corresponds to the associated token in Kovan should appear

<p align="center">
  <img src="./images/daap-image8.png" width="500" height="350" />
</p>


This address can be used to verify the balance and confirm that the tokens were effectively transferred. In the same way, you can use it to make a cross back of tokens between the networks.