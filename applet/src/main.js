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
  color: '#009876',
  failedColor: 'red',
  height: '2px'
})

Vue.component('icon', Icon)
Vue.config.productionTip = false

Vue.prototype.marked = function(raw, fn) {
  if (raw) {
    fn(marked(raw))
  }
};

Vue.prototype.fetch = async function(path) {
  this.$Progress.start()

  try {
    let res = await fetch(`${process.env.MAPI}/drafts/${path}`)

    if (res.ok) {
      this.$Progress.finish()
      if (res.headers.get('content-type').indexOf('json') !== -1) {
        return res.json()
      }

      return res.text()
    }

    if (res.status === 404) {
      this.$router.push({name: "NotFound"})
    }

    this.$Progress.fail()
  } catch(e) {
    console.log('突然断网~')
  }
};

new Vue({
  el: '#app',
  router,
  render: h => h(App),
})
