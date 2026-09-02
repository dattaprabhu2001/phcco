import { Routes, Route } from 'react-router-dom';

import Layout from './site/components/Layout.jsx';
import Home from './site/pages/Home.jsx';
import Publications from './site/pages/Publications.jsx';
import Cohort from './site/pages/Cohort.jsx';
import Contact from './site/pages/Contact.jsx';
import { Blog, BlogPost } from './site/pages/Blog.jsx';
import { Media, Album, Videos } from './site/pages/Media.jsx';
import About from './site/pages/About.jsx';
import Research from './site/pages/Research.jsx';
import Outreach from './site/pages/Outreach.jsx';
import { GetInvolved, EventDetail, NotFound } from './site/pages/GetInvolved.jsx';

import { AuthProvider, RequireAuth } from './admin/Auth.jsx';
import AdminLayout from './admin/components/AdminLayout.jsx';
import Login from './admin/pages/Login.jsx';
import Dashboard from './admin/pages/Dashboard.jsx';
import Collection from './admin/pages/Collection.jsx';
import { Settings, Messages, MediaLibrary, Account } from './admin/pages/Misc.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* public site */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="research" element={<Research />} />
          <Route path="publications" element={<Publications />} />
          <Route path="outreach" element={<Outreach />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="cohort" element={<Cohort />} />
          <Route path="media" element={<Media />} />
          <Route path="media/:slug" element={<Album />} />
          <Route path="media-videos" element={<Videos />} />
          <Route path="get-involved" element={<GetInvolved />} />
          <Route path="events/:slug" element={<EventDetail />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* admin CMS */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="c/:key" element={<Collection />} />
          <Route path="settings" element={<Settings />} />
          <Route path="messages" element={<Messages />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="account" element={<Account />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
