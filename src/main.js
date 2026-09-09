import { App } from './app/App.js';
import './styles.css';

const container = document.querySelector('#app');
const app = new App(container);

app.start();

if (import.meta.env.DEV) {
  window.__PETAL_HEART_APP__ = app;
}
