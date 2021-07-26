# Change Log - @appzmonster/fetch-interceptor

### 1.0.6 (Monday, 26 July 2021 07:40:00 GMT)

- Added feature to disable mock request. Disabled mock request will forward request and return response transparently.

### 1.0.5 (Sunday, 25 July 2021 02:12:00 GMT)

- Fixed error object thrown from MockRequest interceptor.
- Added network error option to MockRequest interceptor to simulate network error.
- Modified MockRequest interceptor error behaviour to follow Fetch API [spec](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), resolve all request and only reject TypeError (when request fails to complete).

### 1.0.4 (Wednesday, 30 June 2021 15:57:00 GMT)

- Fixed instanceof issue caused by babel transpilation.

### 1.0.3 (Wednesday, 30 June 2021 10:10:00 GMT)

- Modified some context in README.md.

### 1.0.2 (Wednesday, 30 June 2021 09:41:00 GMT)

- Corrected publish:npm script in package.json.

### 1.0.1 (Wednesday, 30 June 2021 09:15:00 GMT)

- Fixed some markdown issues in README.md.
- Added console outputs error message when browser does not support Fetch API.
- Modified some english grammar of some error message in initialize function.

### 1.0.0 (Tuesday, 29 June 2021 04:00:00 GMT)

- Initial version
