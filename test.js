const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://shasimalipeddi_db_user:utyiCvTGQLxPRQ5J@cricketcluster.xyevwx2.mongodb.net/cricketAcademy?retryWrites=true&w=majority&appName=CricketCluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected successfully'))
.catch(err => console.error('Connection failed:', err));