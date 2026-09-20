const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // index.html, app.js гэх мэт файлуудаа уншуулна

// Утсуудаас дата авах
app.get('/api/data', (req, res) => {
  const data = fs.readFileSync('./data.json', 'utf8');
  res.json(JSON.parse(data));
});

// Утсуудаас өөрчилсөн датаг хадгалах
app.post('/api/data', (req, res) => {
  fs.writeFileSync('./data.json', JSON.stringify(req.body, null, 2));
  res.json({ message: 'Амжилттай хадгалагдлаа' });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Сервер 3000 порт дээр ажиллаж байна...');
});