import { App } from './app/App.js';
import './styles.css';

const container = document.querySelector('#app');
const app = new App(container);

app.start();

