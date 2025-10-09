const mongoose = require('mongoose');
const Admin = require('./models/Admin'); // Adjust path if needed

const MONGO_URI='mongodb+srv://shasimalipeddi_db_user:utyiCvTGQLxPRQ5J@cricketcluster.xyevwx2.mongodb.net/cricketAcademy?retryWrites=true&w=majority'


mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedAdmin = async () => {
  try {
    const existing = await Admin.findOne({ username: 'admin' });
    if (existing) {
      console.log('Admin already exists');
      return mongoose.disconnect();
    }

    const admin = new Admin({
      username: 'admin2',
      password: 'Password!23' // 🔐 Will be hashed automatically
    });

    await admin.save();
    console.log('✅ Admin created successfully');
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
  } finally {
    mongoose.disconnect();
  }
};

seedAdmin();