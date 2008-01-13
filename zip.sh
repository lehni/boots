zipLib() {
	mkdir Boots/$1
	cd $1
	if [ -d htdocs ]
	then
		cp -pfRL htdocs ../Boots/$1/
	fi
	cd helma
	zip -9 -r ../../Boots/$1/$1.zip * -x "*/.DS_Store" "*/.svn/*"
	cd ../..
}

mkdir Boots

zipLib "base"
zipLib "edit"
zipLib "type"
zipLib "post"
zipLib "wiki"
zipLib "feed"

zip -9 -r Boots.zip Boots/* -x "*/.DS_Store" "*/.svn/*"

rm -fr Boots