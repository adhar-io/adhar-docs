import { registerSW } from 'virtual:pwa-register';
import AOS from "aos";
import "aos/dist/aos.css";

// Initialize AOS
AOS.init();

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {},
  onOfflineReady() {
    console.log('Offline ready');
  }
});

updateSW();
