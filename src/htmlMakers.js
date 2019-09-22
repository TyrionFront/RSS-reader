const setElementsDisplayProperty = (coll, value) => {
  const currentDisplaying = value === 'none' ? 'd-block' : 'd-none';
  coll.forEach((elem) => {
    const { classList } = elem;
    classList.replace(currentDisplaying, `d-${value}`);
  });
};

const formContainer = document.getElementById('jumbotron');
const feedsTag = document.getElementById('rssFeeds');
const newsTag = document.getElementById('news');
const rssExample = document.getElementById('rssExample');
const storyExample = document.getElementById('storyExample');

export const moveRssForm = () => {
  const mainContainer = document.querySelector('body .container-fluid');
  const titlesRow = mainContainer.querySelector('.row.fixed-top');
  titlesRow.classList.remove('d-none');
  mainContainer.classList.remove('h-75');
  formContainer.parentNode.classList.remove('h-100');
  const { classList } = formContainer;
  classList.remove('w-100');
  classList.add('fixed-bottom', 'mb-0', 'mx-3');
};

export const makeRssFeedElem = ({ feeds }, markActive) => {
  const { rssInfo, lastFeedId } = feeds;
  const lastRssInfo = rssInfo[lastFeedId];
  const { title, description, newsCount } = lastRssInfo;
  const newFeedTag = rssExample.cloneNode(false);
  newFeedTag.classList.replace('d-none', 'd-block');

  newFeedTag.id = lastFeedId;
  newFeedTag.addEventListener('click', markActive);
  newFeedTag.innerHTML = `
  <div class="d-flex">
    <h5 class="flex-fill mb-1">${title}</h5>
    <div>
      <span id="newsCount${lastFeedId}" class="badge badge-success badge-pill mb-0">${newsCount}</span>
    </div>
  </div>
  <p class="flex-fill mb-1">${description}</p>
  `;
  feedsTag.prepend(newFeedTag);
};

export const makeNewsList = ({ feeds }) => {
  const { activeFeedId, items } = feeds;
  const { freshNews, allNews } = items;
  const [activeId, sameIdMark] = activeFeedId.split(' ');

  const badgeAndFeedIds = [...allNews.keys()].map(feeId => [feeId, `newsCount${feeId}`]);
  badgeAndFeedIds.forEach(([feeId, badgeId]) => {
    const currentFeedAllNewsCount = allNews.get(feeId).size;
    document.getElementById(badgeId).textContent = currentFeedAllNewsCount;
  });

  freshNews.forEach((story, storyId) => {
    const [currentFeedId] = storyId.split('-');
    const [title, link, description] = story;
    const visualization = !activeId || sameIdMark || activeId === currentFeedId ? 'd-block' : 'd-none';

    const newStoryTag = storyExample.cloneNode(false);
    newStoryTag.id = storyId;
    newStoryTag.classList.add(currentFeedId);
    newStoryTag.classList.replace('d-none', visualization);
    newStoryTag.innerHTML = `
      <a href="${link}">${title}</a>
      <button type="button" class="btn btn-outline-info btn-sm ml-md-3" data-toggle="modal" data-target="#modal${storyId}">
        read more
      </button>
      <div class="modal fade bd-example-modal-lg" id="modal${storyId}" role="dialog" tabindex="-1"
        aria-labelledby="modalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="title${storyId}">${title}</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">${description}</div>
          </div>
        </div>
      </div>
    `;
    newsTag.prepend(newStoryTag);
  });
};

export const displayNews = ({ feeds }) => {
  const { activeFeedId, prevActiveFeedId } = feeds;
  const [currentId] = activeFeedId.split(' ');
  const prevFeed = document.querySelector('#rssFeeds .active');
  const currentFeed = document.getElementById(currentId);
  const allNews = [...newsTag.getElementsByTagName('li')];
  if (currentId === prevActiveFeedId) {
    setElementsDisplayProperty(allNews, 'block');
    currentFeed.classList.remove('active');
    return;
  }
  if (prevFeed) {
    prevFeed.classList.remove('active');
  }
  setElementsDisplayProperty(allNews, 'none');

  currentFeed.classList.add('active');
  const currentFeedNews = [...newsTag.querySelectorAll(`.${currentId}`)];
  setElementsDisplayProperty(currentFeedNews, 'block');
};
