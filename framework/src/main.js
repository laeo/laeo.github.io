import 'whatwg-fetch'
import Vue from 'vue'
import 'vue-awesome/icons/bars'
import Icon from 'vue-awesome/components/Icon'
import VueProgressBar from 'vue-progressbar'
import marked from 'marked'
import "@/assets/github.css"
import '@/assets/app.css'
import App from './App'
import router from './router'

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
})

Vue.use(VueProgressBar, {
  color: 'rgb(143, 255, 199)',
  failedColor: 'red',
  height: '2px'
})

Vue.component('icon', Icon)
Vue.config.productionTip = false

Vue.prototype.marked = function(raw) {
  document.getElementById('article').innerHTML = marked(raw)
};

Vue.prototype.fetch = function(uri) {
  fetch(`${process.env.MAPI}/sources/${uri}`)
  .then(res => {

    if (res.ok) {
      return res.text()
    }

    if (res.status === 404) {
      this.$router.push({name: "NotFound"})
    }

    throw new Error(res.statusText)

  })
  .then(ret => this.marked(ret))
  .catch(e => {
    // alert(e)
  })
};

new Vue({
  el: '#app',
  data() {
    return {
      data: {}
    }
  },
  router,
  render: h => h(App),
})
