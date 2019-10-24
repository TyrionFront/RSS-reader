import validator from 'validator';
import axios from 'axios';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp

export const validateUrl = (feeds, url) => {
  const sameFeed = feeds.find(feed => feed.url === url);
  return validator.isURL(url) && !sameFeed;
};

export const processTypedUrl = (appState, value) => {
  const { form, feeds } = appState;
  form.state = 'onInput';
  if (value.length === 0) {
    form.urlState = 'empty';
    return;
  }
  const isLinkValid = validateUrl(feeds.list, value);
  form.urlState = isLinkValid ? 'is-valid' : 'is-invalid';
  form.url = isLinkValid ? value : '';
};

export const parseRss = (data) => {
  const domParser = new DOMParser();
  const domTree = domParser.parseFromString(data, 'application/xml');
  const parserError = domTree.querySelector('parsererror');
  if (parserError) {
    throw new Error('Wrong data format: \'application/xml\'-method can not parse it');
  }
  const title = domTree.querySelector('channel title').textContent;
  const description = domTree.querySelector('channel description').textContent;

  const itemsList = [...domTree.querySelectorAll('item')].map((item) => {
    const postTitle = item.querySelector('title').textContent;
    const postUrl = item.querySelector('link').textContent;
    const postDescription = item.querySelector('description').textContent;
    return { postTitle, postUrl, postDescription };
  }).reverse();
  return { title, description, itemsList };
};

export const updatePosts = (itemsList, currentFeedId, posts, feeds) => {
  const { all } = posts;
  const currentFeed = _.find(feeds, ['feedId', currentFeedId]);
  const newPosts = _.differenceBy(itemsList, all, 'postTitle');
  const newPostsWithId = newPosts.map((post) => {
    currentFeed.postsCount += 1;
    const postId = `${currentFeedId}-post${currentFeed.postsCount}`;
    all.push({ ...post, postId });
    return { ...post, postId };
  });
  return [currentFeedId, newPostsWithId];
};

export const refreshFeeds = ([currentFeed, ...restFeeds], appState) => {
  const { posts, feeds } = appState;
  if (!currentFeed) {
    return;
  }
  const { feedId, url } = currentFeed;
  axios.get(`https://cors-anywhere.herokuapp.com/${url}`)
    .then(({ data }) => parseRss(data))
    .then(({ itemsList }) => updatePosts(itemsList, feedId, posts, feeds.list))
    .then((freshPosts) => {
      posts.fresh = freshPosts;
      setTimeout(() => refreshFeeds(restFeeds, appState), 0);
    });
};

export const processFormData = (appState) => {
  const { form, feeds, posts } = appState;
  form.state = 'processing';
  axios.get(`https://cors-anywhere.herokuapp.com/${form.url}`)
    .then(({ data }) => {
      const parsedData = parseRss(data);
      form.state = 'processed';
      form.urlState = 'empty';
      return parsedData;
    })
    .then(({ title, description, itemsList }) => {
      const sameFeed = feeds.list.find(feed => feed.title === title);
      if (sameFeed) {
        throw new Error(`SameFeed already exists:\n  id- ${sameFeed.feedId}\n  Title- ${sameFeed.title}`);
      }
      const feedId = `rssFeed${feeds.list.length + 1}`;
      const newFeed = {
        feedId, title, description, postsCount: 0, url: form.url,
      };
      feeds.list.push(newFeed);
      posts.fresh = updatePosts(itemsList, feedId, posts, feeds.list);

      if (feeds.state === 'not-updating') {
        feeds.state = 'updating';
        const refresh = () => {
          feeds.timerId = setTimeout(() => {
            refreshFeeds(appState.feeds.list, appState);
            feeds.timerId = setTimeout(refresh, 30000);
          }, 30000);
        };
        refresh();
      }
    })
    .catch((err) => {
      form.urlState = 'is-invalid';
      form.state = 'failed';
      if (err.response) {
        form.responseStatus = err.response.status;
        throw new Error(err);
      }
      const [statusType] = err.message.split(' ');
      form.responseStatus = statusType;
      throw new Error(err);
    });
};
