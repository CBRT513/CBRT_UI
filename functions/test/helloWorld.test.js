const functionsTest = require('firebase-functions-test')();
const { helloWorld } = require('..');

afterAll(() => functionsTest.cleanup());

test('sends hello response', () => {
  const req = {};
  const res = {
    sendCalledWith: '',
    statusCode: 0,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(message) {
      this.sendCalledWith = message;
    },
  };
  helloWorld(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.sendCalledWith).toBe('Hello from Firebase!');
});
