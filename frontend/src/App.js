import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
  ListItemIcon,
  Fade,
  Zoom,
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Fab,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Menu as MenuIcon,
  Book as BookIcon,
  Translate as TranslateIcon,
  Help as HelpIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Lightbulb as LightbulbIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [text, setText] = useState('');
  const [task, setTask] = useState('simplify');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordDefinition, setWordDefinition] = useState(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [cancelToken, setCancelToken] = useState(null);

  // Set mounted to true after initial render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Check if Gemini is available
    const checkGemini = async () => {
      try {
        const response = await fetch(`${API_URL}/`);
        const data = await response.json();
        console.log('Gemini availability:', data.gemini_available);
      } catch (error) {
        console.error('Error checking Gemini availability:', error);
      }
    };
    
    checkGemini();
  }, []);

  const handleWordClick = async (word) => {
    if (!word || word.length <= 3) return;
    
    setSelectedWord(word);
    setDefinitionLoading(true);
    setWordDefinition(null);
    
    try {
      const response = await fetch(`${API_URL}/define-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch definition');
      }
      
      const data = await response.json();
      setWordDefinition(data);
      setSnackbarMessage(`Definition found for "${word}"`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error fetching definition:', error);
      setError('Failed to fetch definition. Please try again.');
      setSnackbarMessage('Failed to fetch definition. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDefinitionLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setSnackbarMessage('Please enter some text to analyze');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (task === 'qa' && !question.trim()) {
      setError('Please enter a question for Q&A analysis');
      setSnackbarMessage('Please enter a question for Q&A analysis');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    setConfidence(0);
    
    // Create a new cancel token for this request
    const source = axios.CancelToken.source();
    setCancelToken(source);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, task }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze text');
      }
      
      const data = await response.json();
      setResult(data.result);
      setConfidence(data.confidence);
      setSnackbarMessage('Analysis complete!');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      if (axios.isCancel(error)) {
        setSnackbarMessage('Analysis cancelled');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      } else {
        console.error('Error analyzing text:', error);
        setError('Failed to analyze text. Please try again.');
        setSnackbarMessage('Failed to analyze text. Please try again.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } finally {
      setLoading(false);
      setCancelToken(null);
    }
  };

  const handleCancelAnalysis = () => {
    if (cancelToken) {
      cancelToken.cancel('Operation cancelled by the user');
      setLoading(false);
      setSnackbarMessage('Analysis cancelled');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    }
  };

  const renderTextWithClickableWords = (text) => {
    if (!text) return null;
    
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      if (word.trim() && word.length > 3) {
        return (
          <Tooltip key={index} title="Click for definition">
            <span
              style={{ 
                cursor: 'pointer', 
                color: theme.palette.primary.main,
                borderBottom: `1px dotted ${theme.palette.primary.light}`,
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleWordClick(word)}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.palette.primary.light + '20';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              {word}
            </span>
          </Tooltip>
        );
      }
      return <span key={index}>{word}</span>;
    });
  };

  const formatResult = () => {
    if (!result) return null;

    if (task === 'define') {
      const definitions = result.split('\n\n');
      return (
        <List>
          {definitions.map((def, index) => (
            <ListItem key={index} divider={index < definitions.length - 1}>
              <ListItemText primary={renderTextWithClickableWords(def)} />
            </ListItem>
          ))}
        </List>
      );
    } else if (task === 'context' || task === 'qa') {
      const parts = result.split('\n\n');
      if (parts.length > 1) {
        return (
          <Box>
            <Typography variant="body1" paragraph>
              {renderTextWithClickableWords(parts[0])}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            {parts.slice(1).map((part, index) => (
              <Typography key={index} variant="body2" paragraph>
                {renderTextWithClickableWords(part)}
              </Typography>
            ))}
          </Box>
        );
      }
    }

    return <Typography variant="body1">{renderTextWithClickableWords(result)}</Typography>;
  };

  const getTaskIcon = (taskName) => {
    switch (taskName) {
      case 'simplify':
        return <TranslateIcon />;
      case 'define':
        return <BookIcon />;
      case 'context':
        return <InfoIcon />;
      case 'qa':
        return <QuestionAnswerIcon />;
      default:
        return <HelpIcon />;
    }
  };

  const getTaskDescription = (taskName) => {
    switch (taskName) {
      case 'simplify':
        return 'Simplify text to make it easier to understand';
      case 'define':
        return 'Get definitions for complex terms';
      case 'context':
        return 'Analyze the context and get background information';
      case 'qa':
        return 'Ask questions about the text';
      default:
        return '';
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Only render content after component is mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <BookIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Reading Assistant
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <Typography variant="h6" sx={{ px: 2, mb: 2 }}>
            AI Reading Assistant
          </Typography>
          <List>
            <ListItem button onClick={() => { setTask('simplify'); setDrawerOpen(false); }}>
              <ListItemIcon><TranslateIcon /></ListItemIcon>
              <ListItemText primary="Simplify Text" />
            </ListItem>
            <ListItem button onClick={() => { setTask('define'); setDrawerOpen(false); }}>
              <ListItemIcon><BookIcon /></ListItemIcon>
              <ListItemText primary="Define Terms" />
            </ListItem>
            <ListItem button onClick={() => { setTask('context'); setDrawerOpen(false); }}>
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText primary="Context Analysis" />
            </ListItem>
            <ListItem button onClick={() => { setTask('qa'); setDrawerOpen(false); }}>
              <ListItemIcon><QuestionAnswerIcon /></ListItemIcon>
              <ListItemText primary="Question & Answer" />
            </ListItem>
          </List>
          <Divider sx={{ my: 2 }} />
          <List>
            <ListItem>
              <ListItemIcon><PsychologyIcon /></ListItemIcon>
              <ListItemText 
                primary="AI Powered" 
                secondary="Uses advanced AI to understand and simplify text"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SchoolIcon /></ListItemIcon>
              <ListItemText 
                primary="Learning Tool" 
                secondary="Helps you understand complex texts and learn new vocabulary"
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="md" sx={{ flexGrow: 1, py: 4 }}>
        <Fade in={true} timeout={800}>
          <Box>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                mb: 3, 
                borderRadius: 2,
                background: `linear-gradient(to bottom right, ${theme.palette.background.paper}, ${theme.palette.background.default})`
              }}
            >
              {!isMobile && (
                <Tabs
                  value={task}
                  onChange={(e, newValue) => setTask(newValue)}
                  centered
                  sx={{ mb: 3 }}
                  TabIndicatorProps={{
                    style: {
                      backgroundColor: theme.palette.primary.main,
                      height: 3,
                    }
                  }}
                >
                  <Tab 
                    icon={<TranslateIcon />} 
                    label="Simplify" 
                    value="simplify"
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<BookIcon />} 
                    label="Define Terms" 
                    value="define"
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<InfoIcon />} 
                    label="Context" 
                    value="context"
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<QuestionAnswerIcon />} 
                    label="Q&A" 
                    value="qa"
                    iconPosition="start"
                  />
                </Tabs>
              )}

              <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getTaskIcon(task)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6">
                        {task === 'simplify' ? 'Simplify Text' : 
                         task === 'define' ? 'Define Terms' : 
                         task === 'context' ? 'Context Analysis' : 'Question & Answer'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getTaskDescription(task)}
                      </Typography>
                    </Box>
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    label="Enter your text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                      sx: { borderRadius: 2 }
                    }}
                  />

                  {task === 'qa' && (
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Your question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      sx={{ mb: 2 }}
                      InputProps={{
                        sx: { borderRadius: 2 }
                      }}
                    />
                  )}
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAnalyze}
                    disabled={loading}
                    fullWidth
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LightbulbIcon />}
                    sx={{ 
                      borderRadius: 2,
                      py: 1.5,
                      boxShadow: 2
                    }}
                  >
                    {loading ? 'Analyzing...' : 'Analyze Text'}
                  </Button>
                </CardActions>
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleCancelAnalysis}
                      startIcon={<CloseIcon />}
                      size="small"
                    >
                      Cancel Analysis
                    </Button>
                  </Box>
                )}
              </Card>

              {error && (
                <Alert 
                  severity="error" 
                  sx={{ mb: 2, borderRadius: 2 }}
                  action={
                    <IconButton
                      aria-label="close"
                      color="inherit"
                      size="small"
                      onClick={() => setError('')}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              )}

              {result && (
                <Zoom in={true} timeout={500}>
                  <Paper 
                    sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      background: `linear-gradient(to bottom right, ${theme.palette.background.paper}, ${theme.palette.grey[50]})`
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {task === 'simplify' ? 'Simplified Text' : 
                         task === 'define' ? 'Term Definitions' : 
                         task === 'context' ? 'Context Analysis' : 'Answer'}
                      </Typography>
                      <Chip 
                        label={`Confidence: ${Math.round(confidence * 100)}%`} 
                        color={confidence > 0.7 ? "success" : confidence > 0.5 ? "warning" : "error"}
                        size="small"
                        icon={<InfoIcon />}
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    {formatResult()}
                  </Paper>
                </Zoom>
              )}
            </Paper>

            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                background: `linear-gradient(to bottom right, ${theme.palette.background.paper}, ${theme.palette.grey[50]})`
              }}
            >
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <HelpIcon sx={{ mr: 1 }} />
                How It Works
              </Typography>
              <Accordion sx={{ mb: 1, borderRadius: '8px !important' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TranslateIcon sx={{ mr: 2 }} />
                    <Typography>Text Simplification</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    The AI identifies complex words and provides simpler alternatives to make the text easier to understand.
                    Click on any word to see its definition. The system uses advanced AI to break down complicated sentences 
                    and enhance readability while preserving the original meaning.
                  </Typography>
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Example:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Original: "The implementation of quantum computing algorithms necessitates sophisticated error correction mechanisms."
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Simplified: "Quantum computing algorithms need advanced error correction systems."
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
              <Accordion sx={{ mb: 1, borderRadius: '8px !important' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BookIcon sx={{ mr: 2 }} />
                    <Typography>Term Definition</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    The system extracts complex terms from your text and provides definitions from a comprehensive
                    dictionary API. Click on any word to see its definition and examples. This helps you understand 
                    specialized vocabulary and technical terms.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion sx={{ mb: 1, borderRadius: '8px !important' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <InfoIcon sx={{ mr: 2 }} />
                    <Typography>Context Analysis</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    The AI analyzes the text to identify main topics and provides additional context from Wikipedia.
                    It estimates the complexity of the text and offers background information to enhance your understanding.
                    This helps you grasp the broader context and significance of the text.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion sx={{ borderRadius: '8px !important' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <QuestionAnswerIcon sx={{ mr: 2 }} />
                    <Typography>Question Answering</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Ask questions about the text, and the AI will find relevant sentences that answer your question.
                    It also provides additional information from Wikipedia to give you a more comprehensive answer.
                    Click on any word to see its definition. This feature helps you extract specific information from the text.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Box>
        </Fade>
      </Container>

      <Dialog
        open={!!selectedWord}
        onClose={() => setSelectedWord(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: theme.palette.primary.main,
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BookIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Definition for "{selectedWord}"</Typography>
          </Box>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={() => setSelectedWord(null)}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {definitionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : wordDefinition ? (
            <Box>
              <Typography variant="body1" paragraph>
                {wordDefinition.definition}
              </Typography>
              {wordDefinition.examples.length > 0 && (
                <>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Examples:
                  </Typography>
                  <List>
                    {wordDefinition.examples.map((example, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={example} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          ) : (
            <Typography color="error">
              No definition found for this word.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedWord(null)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        severity={snackbarSeverity}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={handleCloseSnackbar}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Fab 
        color="primary" 
        aria-label="help" 
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <HelpIcon />
      </Fab>
    </Box>
  );
}

export default App; 