import React, { Component } from 'react';

import { withFirebase } from '../Firebase';
import AddShow from '../AddShow';
import ButtonTags from '../ButtonTags';
import ContentHeader from '../ContentHeader';
import LogoutButton from '../LogoutButton';
import List from '../List';
import styles from './styles.scss';

class ContentPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      user: null,
      customTagsDB: null,       // custom tags that is in database
      selectedTags: [],      // tags that user selected
      defaultTags: [
        {name: 'Chinese', color: '#FF7373'},
        {name: 'English', color: '#FF7373'},
        {name: 'Indian', color: '#FF7373'},
        {name: 'Japanese', color: '#FF7373'},
        {name: 'Korean', color: '#FF7373'},
        {name: 'Thai', color: '#FF7373'},

        {name: 'Comedy', color: '#FFFF00'},
        {name: 'Documentary', color: '#FFFF00'},
        {name: 'Drama', color: '#FFFF00'},
        {name: 'Horror', color: '#FFFF00'},
        {name: 'Movies', color: '#FFFF00'},
        {name: 'Variety', color: '#FFFF00'}
      ],
      inputData: {
        name: '',
        url: '',
        customTags: '',     // custom tags that user typed during form submit
        isFormValid: false
      },
      showForm: false,
      firstSubmit: false,
      viewWatchlist: true,
      currentList: null
    };
    console.log("Content Page");
  }

  componentDidMount() {
    this.unsubscribe = this.props.firebase.user(this.props.user.uid)
    .onSnapshot(snapshot => {
      this.setState({
        user: snapshot.data(),
        customTagsDB: snapshot.data().customTags ? snapshot.data().customTags : [],
        currentList: snapshot.data().watchlist ? snapshot.data().watchlist.allShows : 'empty'
      });
    });
  }

  componentWillUnmount() {
    this.unsubscribe && this.unsubscribe();
  }

  handleSubmit = (isWatchedSubmit) => {
    var userRef = this.props.firebase.user(this.props.user.uid);
    var updateBatch = this.props.firebase.db.batch();
    var allSubmittedTags = this.state.selectedTags;
    var formCustomTags = this.state.inputData.customTags.split(/, | ,|,/);     // custom tags submitted by form
    var newShowData = {
      name: this.state.inputData.name,
      URL: this.state.inputData.url
    };

    //  Update all shows field
    if(isWatchedSubmit)
      updateBatch.update(userRef, { "watched.allShows": this.props.firebase.fieldValue.arrayUnion(newShowData) });
    else
      updateBatch.update(userRef, { "watchlist.allShows": this.props.firebase.fieldValue.arrayUnion(newShowData) });

    // Update custom tag field
    if(formCustomTags.length != 0) {
      // Filter custom tags for existing tags
      if(this.state.customTagsDB.length != 0) {
        var filteredFormCustomTags = [];
        var inDB = false;

        formCustomTags.forEach((formTag) => {
          this.state.customTagsDB.forEach((DBtag) => {
            if(formTag === DBtag)
              inDB = true;
          });

          if(!inDB)
            filteredFormCustomTags.push(formTag);
          else
            inDB = false;
        });

        if(filteredFormCustomTags[0]) {
          var updatedCustomTags = this.state.customTagsDB.concat(filteredFormCustomTags);

          allSubmittedTags = filteredFormCustomTags.concat(this.state.selectedTags);
          updateBatch.update(userRef, { "customTags": updatedCustomTags });
          this.setState({ customTagsDB: updatedCustomTags });
        }
      }
      else
        updateBatch.update(userRef, { "customTags": formCustomTags });
    }

    // Update all tag fields
    if(allSubmittedTags.length != 0) {
      var tagName = 'NIL';
      var tagObj = {};

      allSubmittedTags.forEach((tag) => {
        if(tag) {
          if(isWatchedSubmit)
            tagName = "watched." + tag;
          else
            tagName = "watchlist." + tag;

          tagObj[tagName] = this.props.firebase.fieldValue.arrayUnion(newShowData);
          updateBatch.update(userRef, tagObj);
        }
      });     //end forEach
    }

    let updatedData = this.state.inputData;
    updatedData['isFormValid'] = false;

    this.setState({
      firstSubmit: false,
      inputData: updatedData
     });

    updateBatch.commit().then(
      (result) => {
      console.log("update successful: ", result);
    },
      (error) => {
      console.log("update failed: ", error)
    }).catch((error) => {
      console.log("Error updating document: ", error);
    });

    console.log("End submit");
    event.preventDefault();
  }

  handleButtonTagClick = (tags, index) => {
    var newSelectedArray = this.state.selectedTags;
    var tagNameFound = this.state.selectedTags.find((tagName) => { return tagName === tags.name });

    tagNameFound ?
    newSelectedArray = this.state.selectedTags.filter((tagName) => tagName != tagNameFound)  //unselected
    : newSelectedArray.push(tags.name);                                                       //selected

    this.setState({
      selectedTags: newSelectedArray,
      currentList: this.state.showForm ? this.state.currentList : this.getSelectedShowsData(tags.name, tagNameFound, newSelectedArray, this.state.viewWatchlist)
    });
}

 handleChange = event => {
   const name = event.target.name;
   const value = event.target.value;
   let updatedData = this.state.inputData;

   updatedData[name] = value;

   if(updatedData.name === '')
     updatedData.isFormValid = false;
   else
     updatedData.isFormValid = true;

   this.setState({ inputData: updatedData });
 }

 getSelectedShowsData = (tagName, isTagUnselected, sTags, isWatchlist) => {
   var cList = this.state.currentList;
   var userList = isWatchlist ? this.state.user.watchlist : this.state.user.watched;
   var newData = [];

   if(!this.state.showForm) {
     if(sTags.length > 1) {

       if(isTagUnselected) {
         newData = userList[sTags[0]] || [];

         for(let i=1; i < sTags.length; i++) {
           let tempList = [];
           let currentTagShows = userList[sTags[i]] || [];

           currentTagShows.forEach((show) => {
             for(let i = 0; i < newData.length; i++) {
               if(show.name ===  newData[i].name) {
                 tempList.push(show);
                 break;
               }
             }
           });
           newData = tempList;
         }
       }
       else {
         let selectedTagShows = userList[tagName] || [];

         selectedTagShows.forEach((show) => {
           for(let i = 0; i < cList.length; i++) {
             if(show.name === cList[i].name) {
               newData.push(show);
               break;
             }
           }
         });
       }
     }
     else {
       switch (sTags.length) {
         case 0: newData = userList.allShows;
         break;

         case 1: newData = userList[sTags[0]] || [];
         break;

         default: []
       }
     }
   };

   return newData;
 }

 toggleAddShow = () => {
   this.setState({
     showForm: !this.state.showForm,
     firstSubmit: true
    });
 }

 handleContentHeaderClick = (onWatchlistClick) => {
   var userList = onWatchlistClick ? this.state.user.watchlist : this.state.user.watched;
   var list = this.getSelectedShowsData('', false, this.state.selectedTags, onWatchlistClick);

   if(userList) {
     if(userList.allShows) {
       if(this.state.selectedTags.length > 1) {
         this.state.selectedTags.forEach((tag) => {
           list = list.concat(this.getSelectedShowsData(tag, false, this.state.selectedTags, onWatchlistClick));
         });
        }
      }
      else
        list = (this.state.selectedTags.length != 0) ? [] : 'empty';
    }
    else
      list = 'empty';

   this.setState({
     viewWatchlist: onWatchlistClick,
     currentList: list
   });
 }

  render() {
    console.log(this.state.selectedTags);
    if(this.state.currentList === null) {
        return <h1> loading... </h1>;
    }
    else {
      let customTagsArray = [];
      let buttonTag = {};

      this.state.customTagsDB.forEach((tag) => {
        if(tag) {
          buttonTag = {
            name: tag,
            color: '#FFD700'
          }
          customTagsArray.push(buttonTag);
        }
      });

      let tags = this.state.defaultTags.concat(customTagsArray);
      tags = tags.filter(tag => tag != undefined);

      var selectedStyle = {
        backgroundColor: this.state.showForm ? '#444' : '#fff',
        color: this.state.showForm ? '#fff' : '#444'
      };

      return (
        <div className={styles.contentPage}>
          <div className={styles.header}>
            <ContentHeader
              onWatchedClick={this.handleContentHeaderClick}
              onWatchlistClick={this.handleContentHeaderClick}
              user={this.state.user}
              />
          </div>

          <div className={styles.headerButtons}>
            <div className={styles.logout}>
              <LogoutButton/>
            </div>
            <button
              className={styles.addShowButton}
              onClick={this.toggleAddShow}
              style={selectedStyle}>
              {this.state.showForm ?
              "Close"
              : "Add Show" }
            </button>
          </div>

          {this.state.showForm ?
            <div className={styles.addShowForm}>
              <AddShow
                onClick={this.handleSubmit}
                onChange={this.handleChange}
                onTagClick={this.handleButtonTagClick}
                tags={tags}
                emptyList={this.state.currentList != 'empty' ? false : true}
                firstSubmit={this.state.firstSubmit}
                isFormValid={this.state.inputData.isFormValid} />
            </div>
            :
            <div className={styles.tags}>
              <ButtonTags
                onTagClick={this.handleButtonTagClick}
                tags={tags}
                />
            </div>
           }

          {this.state.currentList != 'empty' ?
            <div className={styles.showsList}>
              <List data={this.state.currentList} />
            </div>
          : <h1>Your list is empty! Please add a show.</h1> }
        </div>
      );
    }
  }
}

export default withFirebase(ContentPage);
