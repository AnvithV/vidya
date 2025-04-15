# AI Reading Assistant

An intelligent assistant that helps users read and analyze complex texts using free and publicly available APIs. This tool makes difficult texts more accessible by providing explanations, summaries, and contextual information.

## Features

- **Text Simplification**: Breaks down complex passages into easier-to-understand language
- **Term Definitions**: Provides clear explanations of technical or unfamiliar terms
- **Contextual Analysis**: Offers historical, scientific, or philosophical context when relevant
- **Interactive Q&A**: Answers follow-up questions based on the text content

## Technology Stack

- Python 3.8+
- FastAPI for the backend API
- React for the frontend interface
- Free and open-source NLP models and APIs
- SQLite for data storage

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- pip (Python package manager)
- npm (Node package manager)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-reading-assistant.git
cd ai-reading-assistant
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend:
```bash
cd frontend
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
uvicorn main:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all the open-source projects and APIs that make this possible
- Special thanks to the contributors and maintainers of the libraries used in this project 