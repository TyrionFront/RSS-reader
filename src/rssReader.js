import { watch } from 'melanke-watchjs';
import i18next from 'i18next';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp
import resources from '../locales/descriptions';
import {
  processTypedUrl, processFormData, processSearch,
} from './processors';
import { makePostsList, makeFeedItem, displayHidePosts } from './htmlMakers';

export default () => {
  i18next.init({
    debug: true,
    lng: 'descriptions',
    defaultNS: 'errors',
    resources,
  });

  const appState = {
    addRss: {
      state: 'onInput',
      urlState: 'empty',
      url: '',
      responseStatus: '',
    },
    feeds: {
      state: 'not-updating',
      activeFeedId: '',
      timerId: '',
      list: [],
    },
    posts: {
      fresh: [],
      all: [],
    },
    search: {
      state: 'onInput',
      inputState: 'empty',
      text: '',
      selectedIds: new Set(),
    },
  };

  const content = document.getElementById('content');
  const addRssForm = document.getElementById('addRss');
  const [addLinkBtn, urlInputField] = addRssForm.elements;
  const { placeholder } = urlInputField;
  const searchForm = document.getElementById('postsSearch');
  const [searchInput, searchButton] = searchForm;
  const warningNode = document.getElementById('wrongInput');
  const loadingIndicator = document.getElementById('linkLoading');
  const feedsListTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');
  const feedsBadges = {};
  const feedElements = {};

  const getElement = (coll, ...ids) => {
    const tagId = ids.length > 1 ? `${ids.join('-')}` : ids;
    let htmlTag = coll[tagId];
    if (!htmlTag) {
      htmlTag = document.getElementById(tagId);
      coll[tagId] = htmlTag; // eslint-disable-line no-param-reassign
    }
    return htmlTag;
  };

  const markActiveFeed = ({ currentTarget }) => {
    const { activeFeedId } = appState.feeds;
    const currentId = currentTarget.id;
    appState.feeds.activeFeedId = activeFeedId !== currentId ? currentId : `sameFeed-${currentId}`;
  };

  watch(appState.addRss, 'urlState', () => {
    const { urlState } = appState.addRss;
    const [value, warning] = urlState.split(' ');
    urlInputField.className = 'form-control';
    addLinkBtn.disabled = true;
    switch (value) { // eslint-disable-line default-case
      case 'is-valid':
        urlInputField.classList.add(value);
        addLinkBtn.disabled = false;
        break;
      case 'is-invalid':
        urlInputField.classList.add(value);
        warningNode.innerText = i18next.t([`${warning}`, 'unspecific']);
        break;
    }
  });

  watch(appState.addRss, 'state', () => {
    const { state, responseStatus, url } = appState.addRss;
    urlInputField.disabled = false;
    addLinkBtn.disabled = true;
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
    switch (state) { // eslint-disable-line default-case
      case 'processing':
        [...loadingIndicator.children].forEach(({ classList }) => classList.remove('d-none'));
        urlInputField.disabled = true;
        urlInputField.placeholder = '';
        urlInputField.value = '';
        urlInputField.className = 'form-control';
        break;
      case 'processed':
        content.classList.remove('d-none');
        urlInputField.placeholder = placeholder;
        searchInput.disabled = false;
        break;
      case 'failed':
        urlInputField.value = url;
        warningNode.innerText = i18next.t([`${responseStatus}`, 'unspecific']);
        break;
    }
  });

  watch(appState.feeds, 'list', () => {
    makeFeedItem(appState.feeds.list, feedsListTag, markActiveFeed);
  }, 1);

  watch(appState.posts, 'fresh', () => {
    const { fresh } = appState.posts;
    const [activeFeedId] = appState.feeds.activeFeedId.split('-');
    const [currentFeedId] = fresh;
    const { postsCount } = _.find(appState.feeds.list, ['feedId', currentFeedId]);
    const currentFeedBadge = getElement(feedsBadges, currentFeedId, 'badge');
    const postsList = makePostsList(fresh, activeFeedId, appState.search.selectedIds);
    newsTag.prepend(...postsList);
    currentFeedBadge.innerText = postsCount;
  });

  watch(appState.feeds, 'activeFeedId', () => {
    const { activeFeedId } = appState.feeds;
    const { selectedIds } = appState.search;
    const [activeIdValue, sameId] = activeFeedId.split('-');
    displayHidePosts(activeIdValue, [...newsTag.children], selectedIds);
    if (activeIdValue === 'sameFeed') {
      const currentFeedElem = feedElements[sameId];
      currentFeedElem.classList.toggle('active');
      return;
    }
    const currentFeed = getElement(feedElements, activeIdValue);
    const prevActiveFeed = _.find(feedElements, ({ classList }) => classList.contains('active'));
    const feedsPair = prevActiveFeed ? [currentFeed, prevActiveFeed] : [currentFeed];
    feedsPair.forEach(({ classList }) => classList.toggle('active'));
  });

  watch(appState.search, 'inputState', () => {
    const { search } = appState;
    searchInput.className = 'form-control text-center';
    searchButton.disabled = true;
    switch (search.inputState) { // eslint-disable-line default-case
      case 'noMatches':
        searchInput.classList.add('is-invalid');
        break;
      case 'matched':
        searchInput.classList.add('is-valid');
        searchButton.disabled = false;
        break;
    }
  });

  watch(appState.search, 'state', () => {
    const { selectedIds, state } = appState.search;
    const [activeFeedId] = appState.feeds.activeFeedId.split('-');
    switch (state) { // eslint-disable-line default-case
      case 'empty':
        displayHidePosts(activeFeedId, [...newsTag.children], selectedIds);
        break;
      case 'hasValues':
        displayHidePosts(activeFeedId, [...newsTag.children], selectedIds);
        searchButton.disabled = true;
        break;
    }
  });

  urlInputField.addEventListener('input', ({ target }) => {
    const { value } = target;
    processTypedUrl(appState, value);
  });

  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processFormData(appState);
  });

  searchInput.addEventListener('input', ({ target }) => {
    const { value } = target;
    processSearch(appState, value);
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { search, posts } = appState;
    const { text, selectedIds } = search;
    posts.all.forEach(({ postTitle, postId }) => {
      if (postTitle.toLowerCase().includes(text)) {
        selectedIds.add(postId);
      }
    });
    search.state = 'hasValues';
  });
};
