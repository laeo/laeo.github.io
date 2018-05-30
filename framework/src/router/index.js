import Vue from 'vue'
import Router from 'vue-router'
import Main from '@/views/Main'
import NotFound from '@/views/NotFound'

Vue.use(Router)

export default new Router({
  mode: `${process.env.MODE}`,
  linkActiveClass: "active",
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Main
    },
    {
      path: '/posts/:path(.+)',
      name: 'Main',
      component: Main
    },
    {
      path: '/404.html',
      name: 'NotFound',
      component: NotFound
    },
    {
      path: '*',
      component: NotFound
    },
  ]
})
