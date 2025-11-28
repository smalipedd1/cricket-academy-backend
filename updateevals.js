// updateevals.js
const mongoose = require('mongoose');
const MONGO_URI='mongodb+srv://shasimalipeddi_db_user:utyiCvTGQLxPRQ5J@cricketcluster.xyevwx2.mongodb.net/cricketAcademy?retryWrites=true&w=majority'


async function run() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const Evaluation = mongoose.connection.collection('evaluations');

  const result = await Evaluation.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'Submitted' } }
  );

  console.log(`Updated ${result.modifiedCount} documents`);
  await mongoose.disconnect();
}

run().catch(err => console.error(err));
