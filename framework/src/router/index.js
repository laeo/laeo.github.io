import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/views/Home'
import Reader from '@/views/Reader'
import NotFound from '@/views/NotFound'

Vue.use(Router)

export default new Router({
  mode: `${process.env.MODE}`,
  linkActiveClass: "active",
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { x: 0, y: 0 }
    }
  },
  routes: [
    {
      path: '/archives/:uri',
      name: 'Reader',
      component: Reader
    },
    {
      path: '/404.html',
      name: 'NotFound',
      component: NotFound
    },
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '*',
      component: NotFound
    },
  ]
})
