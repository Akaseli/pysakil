import express from 'express';

const app = express();

app.get('/api', (req, res) => {
  res.send('Hello world.');
});

app.listen(3000, () => {
  console.log('Backend up on port 3000');
});
