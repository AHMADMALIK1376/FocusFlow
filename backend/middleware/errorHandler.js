module.exports = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle Oracle database errors
    if (err.message && err.message.includes('ORA-')) {
        return res.status(500).json({ error: 'Database error occurred.' });
    }
    
    // Handle duplicate key errors
    if (err.message && err.message.includes('unique constraint')) {
        return res.status(409).json({ error: 'Resource already exists.' });
    }
    
    res.status(500).json({ error: err.message || 'Internal server error.' });
};