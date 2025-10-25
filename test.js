const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

router.get('/test-token', (req, res) => {
  const token = jwt.sign(
    { userId: 'replace_with_valid_coach_id', role: 'coach' },
    SECRET,
    { expiresIn: '1h' }
  );
  res.json({ token });
});