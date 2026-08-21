import os
import time
import base64
import hmac
import requests
import urllib.parse

api_key = "98e35605-a888-45ce-bb86-9d63a68d6cba"
secret = "438C685045E4E6AE332B0ACD241CD24F"
passphrase = "KuroOkx1#"

timestamp = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
method = "GET"
request_path = "/api/v6/dex/aggregator/quote?chainIndex=1952&amount=10000000000000000&fromTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&toTokenAddress=0xdB05A386810c809aD5a77422eb189D36c7f24402&slippagePercent=0.5"

message = str(timestamp) + str(method) + str(request_path)
mac = hmac.new(bytes(secret, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod='sha256')
d = mac.digest()
sign = base64.b64encode(d).decode('utf-8')

headers = {
    "OK-ACCESS-KEY": api_key,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "Content-Type": "application/json"
}

r = requests.get("https://www.okx.com" + request_path, headers=headers)
print(r.text)
