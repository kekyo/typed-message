import React, { useState } from 'react'
// Alias setting in vite.config.ts allows using 'typed-message' package name
import { TypedMessageProvider, TypedMessage, useTypedMessage } from 'typed-message'
import { messages } from './generated/messages'
import './App.css'

// Import locale dictionaries
import enMessages from '../locale/en.json'
import jaMessages from '../locale/ja.json'

type Locale = 'en' | 'ja'

const localeMessages = {
  en: enMessages,
  ja: jaMessages,
}

const localeNames = {
  en: 'English',
  ja: 'Japanese',
}

// Formatter functionality demo component
const FormatterDemo: React.FC = () => {
  const getMessage = useTypedMessage();
  const [firstName, setFirstName] = useState('John');
  const [lastName, setLastName] = useState('Doe');
  const [age, setAge] = useState(25);
  const [itemCount, setItemCount] = useState(3);
  const [itemType, setItemType] = useState('books');

  return (
    <div className="formatter-demo">
      <h3>Formatter Functionality Demo</h3>
      
      <div className="demo-section">
        <h4>Parameterized Messages</h4>
        <div className="input-group">
          <input 
            type="text" 
            value={firstName} 
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
          />
          <input 
            type="text" 
            value={lastName} 
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
          />
          <input 
            type="number" 
            value={age} 
            onChange={(e) => setAge(Number(e.target.value))}
            placeholder="Age"
          />
        </div>
        <div className="result">
          {/* TypeScript type checking works! */}
          <strong>Result: </strong>
          {getMessage(messages.WELCOME_USER, [firstName, lastName, age])}
        </div>
      </div>

      <div className="demo-section">
        <h4>Shopping Cart</h4>
        <div className="input-group">
          <input 
            type="number" 
            value={itemCount} 
            onChange={(e) => setItemCount(Number(e.target.value))}
            placeholder="Item Count"
          />
          <input 
            type="text" 
            value={itemType} 
            onChange={(e) => setItemType(e.target.value)}
            placeholder="Item Type"
          />
        </div>
        <div className="result">
          <strong>Result: </strong>
          {getMessage(messages.ITEM_COUNT, [itemCount, itemType])}
        </div>
      </div>

      <div className="demo-section">
        <h4>Date and Temperature</h4>
        <div className="result">
          <strong>Result: </strong>
          {getMessage(messages.FORMATTED_DATE, [new Date(), 23])}
        </div>
      </div>

      <div className="demo-section">
        <h4>Integrated Component Version (Recommended)</h4>
        <div className="result">
          <TypedMessage 
            message={messages.WELCOME_USER} 
            params={[firstName, lastName, age]} 
          />
        </div>
      </div>
    </div>
  );
};

// Fallback functionality demo component
const FallbackDemo: React.FC = () => {
  const [demoValue, setDemoValue] = useState(42);
  const [demoStatus, setDemoStatus] = useState('Active');

  return (
    <div className="fallback-demo">
      <h3 className="fallback-title">
        <TypedMessage message={messages.FALLBACK_ONLY_TITLE} />
      </h3>
      
      <div className="fallback-info">
        <div className="fallback-message">
          <TypedMessage message={messages.FALLBACK_ONLY_MESSAGE} />
        </div>
        <div className="fallback-description">
          <TypedMessage message={messages.FALLBACK_ONLY_DESCRIPTION} />
        </div>
        <div className="fallback-note">
          <strong><TypedMessage message={messages.FALLBACK_ONLY_NOTE} /></strong>
        </div>
      </div>

      <div className="demo-section">
        <h4>Fallback with Parameters Test</h4>
        <div className="input-group">
          <input 
            type="number" 
            value={demoValue} 
            onChange={(e) => setDemoValue(Number(e.target.value))}
            placeholder="Value"
          />
          <input 
            type="text" 
            value={demoStatus} 
            onChange={(e) => setDemoStatus(e.target.value)}
            placeholder="Status"
          />
        </div>
        <div className="result">
          <strong>Result: </strong>
          <TypedMessage 
            message={messages.FALLBACK_ONLY_DEMO} 
            params={[demoValue, demoStatus]} 
          />
        </div>
      </div>

      <div className="fallback-visual-indicator">
        <div className="indicator-box">
          <span className="indicator-dot"></span>
          <span>Fallback display active (identifiable by FB: prefix)</span>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentLocale, setCurrentLocale] = useState<Locale>('en')

  return (
    <TypedMessageProvider messages={localeMessages[currentLocale]}>
      <div className="app">
        <header className="header">
          <div className="container">
            <h1 className="title">
              <TypedMessage message={messages.TITLE} />
            </h1>
            <p className="subtitle">
              <TypedMessage message={messages.SUBTITLE} />
            </p>
          </div>
        </header>

        <main className="main">
          <div className="container">
            <div className="welcome-section">
              <h2 className="welcome-title">
                <TypedMessage message={messages.WELCOME_MESSAGE} />
              </h2>
              <p className="description">
                <TypedMessage message={messages.DESCRIPTION} />
              </p>
            </div>

            <div className="language-selector">
              <h3>
                <TypedMessage message={messages.CHANGE_LANGUAGE} />
              </h3>
              <div className="current-language">
                <strong><TypedMessage message={messages.CURRENT_LANGUAGE} />:</strong> {localeNames[currentLocale]}
              </div>
              <div className="language-buttons">
                {Object.entries(localeNames).map(([locale, name]) => (
                  <button
                    key={locale}
                    className={`language-button ${currentLocale === locale ? 'active' : ''}`}
                    onClick={() => setCurrentLocale(locale as Locale)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="features-section">
              <h3 className="features-title">
                <TypedMessage message={messages.FEATURES_TITLE} />
              </h3>
              <div className="features-grid">
                <div className="feature-card">
                  <h4><TypedMessage message={messages.FEATURE_TYPE_SAFE} /></h4>
                  <p>Message management leveraging TypeScript type safety</p>
                </div>
                <div className="feature-card">
                  <h4><TypedMessage message={messages.FEATURE_HOT_RELOAD} /></h4>
                  <p>Automatic detection of locale file changes during development</p>
                </div>
                <div className="feature-card">
                  <h4><TypedMessage message={messages.FEATURE_PRIORITY} /></h4>
                  <p>Aggregation by priority: default.json, en.json, and others</p>
                </div>
              </div>
            </div>

            {/* New formatter demo section */}
            <FormatterDemo />

            {/* Fallback demo section */}
            <FallbackDemo />

            <div className="demo-section">
              <button className="sample-button">
                <TypedMessage message={messages.SAMPLE_BUTTON} />
              </button>
            </div>
          </div>
        </main>

        <footer className="footer">
          <div className="container">
            <p>
              <TypedMessage message={messages.FOOTER_TEXT} />
            </p>
          </div>
        </footer>
      </div>
    </TypedMessageProvider>
  )
}

export default App 