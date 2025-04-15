import React, { useState } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import axios from 'axios';

function App() {
  const [text, setText] = useState('');
  const [task, setTask] = useState('simplify');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await axios.post('http://localhost:8000/analyze', {
        text,
        task,
        question: task === 'qa' ? question : undefined,
      });

      setResult(response.data.result);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred while analyzing the text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          AI Reading Assistant
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Tabs
            value={task}
            onChange={(e, newValue) => setTask(newValue)}
            centered
            sx={{ mb: 2 }}
          >
            <Tab value="simplify" label="Simplify" />
            <Tab value="define" label="Define Terms" />
            <Tab value="context" label="Context" />
            <Tab value="qa" label="Q&A" />
          </Tabs>

          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            label="Enter your text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ mb: 2 }}
          />

          {task === 'qa' && (
            <TextField
              fullWidth
              variant="outlined"
              label="Your question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleAnalyze}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : 'Analyze'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Result:
              </Typography>
              <Typography>{result}</Typography>
            </Paper>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default App; 